import mongoose, { Schema, Document } from 'mongoose';

export interface IViaCepData {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface IResult extends Document {
  crawlId: string;
  cep: string;
  success: boolean;
  found: boolean;
  data: IViaCepData | null;
  error: string | null;
  attempts: number;
  processedAt: Date;
}

const ResultSchema = new Schema<IResult>(
  {
    crawlId: {
      type: String,
      required: true,
      index: true,
    },
    cep: {
      type: String,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    found: {
      type: Boolean,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ResultSchema.index({ crawlId: 1, cep: 1 });

export const Result = mongoose.model<IResult>('Result', ResultSchema);
