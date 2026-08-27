-- AlterTable
ALTER TABLE "Extraction" ADD COLUMN     "tdsConfianza" DOUBLE PRECISION,
ADD COLUMN     "tdsConfianzaLabel" TEXT,
ADD COLUMN     "tdsEstimado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tdsRangoMax" DOUBLE PRECISION,
ADD COLUMN     "tdsRangoMin" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "TdsCalibration" (
    "metodo" TEXT NOT NULL,
    "muestras" INTEGER NOT NULL DEFAULT 0,
    "sesgoPromedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TdsCalibration_pkey" PRIMARY KEY ("metodo")
);
