import type { components } from "./api-types";
import { apiClient } from "./api-client";

export type TestResponse = components["schemas"]["TestResponse"];

export async function getTestStatus(): Promise<TestResponse> {
  const { data, error } = await apiClient.GET("/test");

  if (error || !data) {
    throw new Error("Test endpoint failed");
  }

  return data;
}
