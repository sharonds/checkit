import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function jsonWithCors(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...init?.headers, ...CORS_HEADERS },
  });
}
