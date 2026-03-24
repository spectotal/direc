import { loadDoctorReport } from "./doctor-helpers.js";
import { formatDoctorReport } from "./doctor-output.js";

type DoctorOptions = {
  extension?: string[];
};

export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
  const report = await loadDoctorReport(process.cwd(), options.extension);
  process.stdout.write(formatDoctorReport(report));
}
