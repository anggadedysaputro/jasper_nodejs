interface DbConfig {
    driver?: string;
    host?: string;
    port?: number;
    dbname?: string;
    username?: string;
    password?: string;
}
interface ExportOptions {
    reportFile: string;
    outputDir: string;
    format?: string;
    params?: Record<string, any>;
    db?: DbConfig | null;
}
interface ReportServiceOptions {
    jasperBinaryPath?: string;
    basePath?: string;
}
declare class ReportService {
    private jasperPath;
    constructor(options?: ReportServiceOptions);
    private checkJava;
    private compileJrxml;
    /** 🔹 Builder export dengan chaining */
    export(options: ExportOptions): {
        command(): Promise<string>;
        run(): Promise<string>;
    };
}

export { type DbConfig, type ExportOptions, ReportService, type ReportServiceOptions, ReportService as default };
