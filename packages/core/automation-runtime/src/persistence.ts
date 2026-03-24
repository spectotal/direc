import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { DIREC_DIRECTORY_NAME } from "direc-analysis-runtime";
import type { SubagentLatestRecord, SubagentRequest, SubagentResult } from "./types.js";
import { readJsonFile, writeJsonFile } from "./json-files.js";

const AUTOMATION_DIRECTORY = "automation";
const REQUESTS_DIRECTORY = "requests";
const RESULTS_DIRECTORY = "results";
const LATEST_DIRECTORY = "latest";

function getAutomationPath(repositoryRoot: string, ...parts: string[]): string {
  return resolve(repositoryRoot, DIREC_DIRECTORY_NAME, AUTOMATION_DIRECTORY, ...parts);
}

export async function ensureAutomationLayout(repositoryRoot: string): Promise<void> {
  await Promise.all([
    mkdir(getAutomationPath(repositoryRoot), { recursive: true }),
    mkdir(getAutomationPath(repositoryRoot, REQUESTS_DIRECTORY), { recursive: true }),
    mkdir(getAutomationPath(repositoryRoot, RESULTS_DIRECTORY), { recursive: true }),
    mkdir(getAutomationPath(repositoryRoot, LATEST_DIRECTORY), { recursive: true }),
  ]);
}

export async function writeSubagentRequest(
  repositoryRoot: string,
  request: SubagentRequest,
): Promise<string> {
  await ensureAutomationLayout(repositoryRoot);
  const path = getAutomationPath(
    repositoryRoot,
    REQUESTS_DIRECTORY,
    `${sanitizeSegment(request.id)}.json`,
  );
  await writeJsonFile(path, request);
  return path;
}

export async function writeSubagentResult(
  repositoryRoot: string,
  result: SubagentResult,
): Promise<string> {
  await ensureAutomationLayout(repositoryRoot);
  const path = getAutomationPath(
    repositoryRoot,
    RESULTS_DIRECTORY,
    `${sanitizeSegment(result.requestId)}.json`,
  );
  await writeJsonFile(path, result);
  return path;
}

export async function writeLatestSubagentResult(
  repositoryRoot: string,
  changeId: string,
  record: SubagentLatestRecord,
): Promise<string> {
  await ensureAutomationLayout(repositoryRoot);
  const path = getAutomationPath(
    repositoryRoot,
    LATEST_DIRECTORY,
    `${sanitizeSegment(changeId)}.json`,
  );
  await writeJsonFile(path, record);
  return path;
}

export async function readLatestSubagentResult(
  repositoryRoot: string,
  changeId: string,
): Promise<SubagentLatestRecord | null> {
  return readJsonFile(
    getAutomationPath(repositoryRoot, LATEST_DIRECTORY, `${sanitizeSegment(changeId)}.json`),
  );
}

function sanitizeSegment(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "_");
}
