import type { Mongoose } from 'mongoose';

declare global {
  var mongodb: Mongoose | string | null;
}

export type PagingData<T> = {
  pageNum;
  pageSize;
  data: T[];
  total;
};

export type RequestPaging = { pageNum: number; pageSize: number };
