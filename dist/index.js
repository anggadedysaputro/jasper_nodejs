// src/index.ts
import { exec } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
var execAsync = promisify(exec);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ReportService = class {
  constructor(options = {}) {
    const defaultJasperPath = path.join(__dirname, "jasper/bin/jasper");
    this.jasperPath = options.jasperBinaryPath ?? defaultJasperPath;
  }
  async checkJava() {
    try {
      await execAsync("java -version");
    } catch {
      throw new Error(
        "\u274C Java is required to run JasperReports.\nPlease install Java (JRE or JDK) and make sure `java` is in your PATH."
      );
    }
  }
  async compileJrxml(jrxmlPath) {
    const outputDir = path.dirname(jrxmlPath);
    const outputFile = path.join(
      outputDir,
      `${path.basename(jrxmlPath, ".jrxml")}.jasper`
    );
    const cmd = `"${this.jasperPath}" compile "${jrxmlPath}" -o "${outputDir}"`;
    const { stderr } = await execAsync(cmd);
    if (stderr) console.warn("\u26A0\uFE0F Jasper stderr:", stderr);
    return outputFile;
  }
  /** 🔹 Builder export dengan chaining */
  export(options) {
    const self = this;
    return {
      async command() {
        let reportFile = options.reportFile;
        if (path.extname(reportFile) === ".jrxml") {
          reportFile = path.join(
            path.dirname(reportFile),
            `${path.basename(reportFile, ".jrxml")}.jasper`
          );
        }
        const paramString = "-P " + Object.entries(options.params || {}).map(([key, value]) => {
          let val = typeof value === "object" ? JSON.stringify(value) : String(value);
          val = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
          return ` ${key}="${val}"`;
        }).join(" ");
        let dbString = "";
        const db = options.db;
        if (db?.driver && db?.host && db?.dbname && db?.username && db?.password) {
          dbString = ` -t ${db.driver} -H ${db.host}${db.port ? ` --db-port ${db.port}` : ""} -n ${db.dbname} -u ${db.username} -p ${db.password}`;
        }
        return `"${self.jasperPath}" process "${reportFile}" -o "${options.outputDir}" -f ${options.format ?? "pdf"} ${paramString}${dbString}`;
      },
      async run() {
        await self.checkJava();
        let reportFile = options.reportFile;
        if (path.extname(reportFile) === ".jrxml") {
          reportFile = await self.compileJrxml(reportFile);
        }
        const cmd = await this.command();
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr) console.warn("\u26A0\uFE0F Jasper stderr:", stderr);
        return stdout;
      }
    };
  }
};
var index_default = ReportService;
export {
  ReportService,
  index_default as default
};
