import { exec } from 'child_process'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const execAsync = promisify(exec)

/* =======================
 * ESModule __dirname fix
 * ======================= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* =======================
 * Types
 * ======================= */
export interface DbConfig {
  driver?: string
  host?: string
  port?: number
  dbname?: string
  username?: string
  password?: string
}

export interface ExportOptions {
  reportFile: string
  outputDir: string
  format?: string
  params?: Record<string, any>
  db?: DbConfig | null
}

export interface ReportServiceOptions {
  jasperBinaryPath?: string
  basePath?: string
}

/* =======================
 * Service
 * ======================= */
export class ReportService {
  private jasperPath: string

  constructor(options: ReportServiceOptions = {}) {
    const defaultJasperPath = path.join(__dirname, 'jasper/bin/jasper')
    this.jasperPath = options.jasperBinaryPath ?? defaultJasperPath
  }

  private async checkJava(): Promise<void> {
    try {
      await execAsync('java -version')
    } catch {
      throw new Error(
        '❌ Java is required to run JasperReports.\n' +
        'Please install Java (JRE or JDK) and make sure `java` is in your PATH.'
      )
    }
  }

  private async compileJrxml(jrxmlPath: string): Promise<string> {
    const outputDir = path.dirname(jrxmlPath)
    const outputFile = path.join(
      outputDir,
      `${path.basename(jrxmlPath, '.jrxml')}.jasper`
    )

    const cmd = `"${this.jasperPath}" compile "${jrxmlPath}" -o "${outputDir}"`
    const { stderr } = await execAsync(cmd)
    if (stderr) console.warn('⚠️ Jasper stderr:', stderr)
    return outputFile
  }

  /** 🔹 Builder export dengan chaining */
  export(options: ExportOptions) {
    const self = this

    return {
      async command(): Promise<string> {
        let reportFile = options.reportFile
        if (path.extname(reportFile) === '.jrxml') {
          reportFile = path.join(
            path.dirname(reportFile),
            `${path.basename(reportFile, '.jrxml')}.jasper`
          )
        }

        const paramString = "-P "+Object.entries(options.params || {})
          .map(([key, value]) => {
            let val = typeof value === 'object' ? JSON.stringify(value) : String(value)
            val = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
            return ` ${key}="${val}"`
          })
          .join(' ')

        let dbString = ''
        const db = options.db
        if (db?.driver && db?.host && db?.dbname && db?.username && db?.password) {
          dbString = ` -t ${db.driver} -H ${db.host}${db.port ? ` --db-port ${db.port}` : ''} -n ${db.dbname} -u ${db.username} -p ${db.password}`
        }

        return `"${self.jasperPath}" process "${reportFile}" -o "${options.outputDir}" -f ${options.format ?? 'pdf'} ${paramString}${dbString}`
      },

      async run(): Promise<string> {
        await self.checkJava()

        let reportFile = options.reportFile
        if (path.extname(reportFile) === '.jrxml') {
          reportFile = await self.compileJrxml(reportFile)
        }

        const cmd = await this.command()
        const { stdout, stderr } = await execAsync(cmd)
        if (stderr) console.warn('⚠️ Jasper stderr:', stderr)
        return stdout
      }
    }
  }
}

/* =======================
 * Default export
 * ======================= */
export default ReportService
