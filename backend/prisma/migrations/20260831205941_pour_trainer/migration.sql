-- CreateTable
CREATE TABLE "PourTrainerSesion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ejercicio" TEXT NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PourTrainerSesion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PourTrainerSesion" ADD CONSTRAINT "PourTrainerSesion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
