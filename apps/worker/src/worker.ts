import { Worker, Queue } from "bullmq";
import { prisma } from "@central-afiliado/database";

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    maxRetriesPerRequest: null as null,
  };
}

const connection = parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379");

export const sendQueue = new Queue("send-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

const worker = new Worker(
  "send-queue",
  async (job) => {
    const { sendJobId } = job.data as { sendJobId: string };

    console.log(`[worker] Processando job ${sendJobId}`);

    const sendJob = await prisma.sendJob.findUnique({
      where: { id: sendJobId },
      include: { destination: true, product: true },
    });

    if (!sendJob) {
      throw new Error(`SendJob ${sendJobId} não encontrado`);
    }

    if (sendJob.status !== "APPROVED") {
      console.log(`[worker] Job ${sendJobId} não está APPROVED, status atual: ${sendJob.status}`);
      return;
    }

    await prisma.sendJob.update({
      where: { id: sendJobId },
      data: { status: "PROCESSING" },
    });

    if (sendJob.destination.provider === "MANUAL") {
      await prisma.sendJob.update({
        where: { id: sendJobId },
        data: { status: "SENT", sentAt: new Date() },
      });
      console.log(`[worker] Job ${sendJobId} marcado como SENT (modo manual)`);
      return;
    }

    throw new Error(`Provider ${sendJob.destination.provider} não implementado no MVP`);
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} concluído`);
});

worker.on("failed", async (job, err) => {
  console.error(`[worker] Job ${job?.id} falhou:`, err.message);

  if (job?.data.sendJobId) {
    await prisma.sendJob.update({
      where: { id: job.data.sendJobId },
      data: {
        status: "FAILED",
        errorMessage: err.message,
        retryCount: { increment: 1 },
      },
    }).catch(console.error);
  }
});

console.log("[worker] Worker iniciado — aguardando jobs na fila send-queue");
