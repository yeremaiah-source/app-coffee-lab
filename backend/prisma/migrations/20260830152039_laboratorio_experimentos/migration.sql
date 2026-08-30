-- CreateTable
CREATE TABLE "Experimento" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hipotesis" TEXT NOT NULL,
    "variableModificada" TEXT NOT NULL,
    "variablesConstantes" TEXT,
    "resultadoEsperado" TEXT,
    "resultadoReal" TEXT,
    "conclusion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experimento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Experimento" ADD CONSTRAINT "Experimento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
