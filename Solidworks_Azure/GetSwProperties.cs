#nullable enable

using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Data;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using SolidWorks.Interop.swdocumentmgr;

namespace SwDmApp
{
    class Program
    {
        static readonly string DEFAULT_PATH     = @"N:\";
        static readonly string OUTPUT_DIRECTORY = @"C:\Projects\Assembilies library\Solidworks_Azure\Solidworks_Assemblies_CSV_Output";
        static readonly string OUTPUT_CSV       = Path.Combine(OUTPUT_DIRECTORY, $"solidworks_assemblies_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
        static readonly string LICENSE_KEY      = "STEVENDOUGLASCORP:swdocmgr_general-11785-02051-00064-33793-08754-34307-00007-51096-10869-56947-19619-60232-53076-04440-49153-37359-11676-45140-30002-15339-31504-22726-20812-22805-14613-15633-07509-01329-03405-18749-00321-25656-23152-60116-23256-24676-27236-3";

        static readonly string SQL_SERVER   = "solidworksserver.database.windows.net";
        static readonly string SQL_DATABASE = "free-sql-db-9499891";
        static readonly string SQL_USER     = "akamuju";
        static readonly string SQL_PASSWORD = "Voltages84gilds$";
        static readonly string SQL_TABLE    = "solidworks_assemblies";

        static readonly string CONNECTION_STRING =
            $"Server=tcp:{SQL_SERVER},1433;" +
            $"Initial Catalog={SQL_DATABASE};" +
            $"User ID={SQL_USER};" +
            $"Password={SQL_PASSWORD};" +
            "Encrypt=True;" +
            "TrustServerCertificate=False;" +
            "Connection Timeout=30;";

        static readonly Regex JOB_FOLDER_PATTERN = new Regex(@"^\d{3,4}[\s_]", RegexOptions.Compiled);
        static readonly Regex PASS_PATTERN       = new Regex(@"^\d{1,4}-[a-zA-Z0-9]{1,5}-\d{1,3}(?:-(?:[rRlL]|\d+))?$", RegexOptions.Compiled);

        static readonly string[] MECHANICAL_HINTS = { "mechanical", "mech", "mechan" };
        static readonly string[] SW_FOLDER_HINTS  = { "solidworks", "solid works", "sw", "parts", "assembly", "assemblies", "part", "sldworks", "modeled", "assy", "modeled parts and assy", "cad" };

        static async Task Main(string[] args)
        {
            try
            {
                if (!Directory.Exists(OUTPUT_DIRECTORY))
                    Directory.CreateDirectory(OUTPUT_DIRECTORY);

                string rootPath = args.Length > 0 ? args[0] : DEFAULT_PATH;
                if (!Directory.Exists(rootPath))
                {
                    Console.WriteLine("Error: Root path not found: " + rootPath);
                    return;
                }

                Console.WriteLine("Scanning root for Assemblies: " + rootPath);

                int totalFileCount   = 0;
                int jobFolderCount   = 0;
                int totalSqlInserted = 0;
                int completedJobs    = 0;
                object csvLock       = new object();

                // Headers: Renamed Part Number to File Name, renamed PartNo Evaluated to PartNo
                var headers = new[] { "Job ID", "Job Name", "File Name", "PartNo", "DESCRIPTION" };

                // Removed ClearAzureSqlTableAsync() to allow incremental loading

                using (var writer = new StreamWriter(OUTPUT_CSV, false, new System.Text.UTF8Encoding(true)))
                {
                    writer.WriteLine(string.Join(",", headers.Select(EscapeCsv)));

                    var allJobFolders = SafeGetDirectories(rootPath)
                        .Select(Path.GetFileName)
                        .Where(f => f != null && JOB_FOLDER_PATTERN.IsMatch(f))
                        .OrderBy(f => {
                            var nMatch = Regex.Match(f!, @"^(\d+)");
                            return nMatch.Success ? int.Parse(nMatch.Groups[1].Value) : 999999;
                        })
                        .ToList();

                    // *** FULL SCAN ENABLED ***
                    var jobFolders = allJobFolders;
                    Console.WriteLine($"Found {allJobFolders.Count} total job folders. Commencing Parallel Scan.");

                    // *** PARALLEL PROCESSING ENGINE ***
                    await Parallel.ForEachAsync(jobFolders, new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (jobFolder, ct) =>
                    {
                        try
                        {
                            Interlocked.Increment(ref jobFolderCount);
                            
                            // Initialize local Document Manager for this thread
                            SwDMClassFactory localFactory = new SwDMClassFactory();
                            SwDMApplication localDmApp = localFactory.GetApplication(LICENSE_KEY);

                            var match    = Regex.Match(jobFolder!, @"^(\d+)[-_\s]*(.*)$");
                            string jobId   = match.Success ? match.Groups[1].Value : "Unknown";
                            string jobName = match.Success ? match.Groups[2].Value : jobFolder!;

                            string jobPath = Path.Combine(rootPath, jobFolder!);

                            string? mechFolder = SafeGetDirectories(jobPath)
                                .FirstOrDefault(d => MECHANICAL_HINTS.Any(h =>
                                    Path.GetFileName(d).ToLower().Contains(h.ToLower())));

                            if (!string.IsNullOrEmpty(mechFolder))
                            {
                                string? swFolder = SafeGetDirectories(mechFolder)
                                    .FirstOrDefault(d => SW_FOLDER_HINTS.Any(h =>
                                        Path.GetFileName(d).ToLower().Contains(h.ToLower())));

                                if (!string.IsNullOrEmpty(swFolder))
                                {
                                    var swFiles = SafeGetFiles(swFolder, "*.SLDASM");
                                    var jobRows = new List<ValidationRow>();
                                    var seenRecords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                                    foreach (var filePath in swFiles)
                                    {
                                        var data = new Dictionary<string, string>();
                                        data["Job ID"]      = jobId;
                                        data["Job Name"]    = jobName;
                                        string fileNameOnly = Path.GetFileNameWithoutExtension(filePath);
                                        data["Part Number"] = fileNameOnly;

                                        // 1. Extraction & Validation
                                        var validation = ExtractAndValidate(localDmApp, filePath, data);
                                        string evaluatedPartNo = data.ContainsKey("PartNo") ? data["PartNo"] : "";
                                        string description = data.ContainsKey("DESCRIPTION") ? data["DESCRIPTION"] : "";

                                        // 2. Deduplication check
                                        string recordKey = $"{fileNameOnly}|{evaluatedPartNo}|{description}";
                                        if (!seenRecords.Add(recordKey)) continue;

                                        // 3. Pattern Matching Filter
                                        if (PASS_PATTERN.IsMatch(fileNameOnly) || PASS_PATTERN.IsMatch(evaluatedPartNo))
                                        {
                                            data["File Name"] = fileNameOnly;
                                            data["PartNo"] = evaluatedPartNo;

                                            if (data.ContainsKey("DESCRIPTION") && data["DESCRIPTION"] == "-")
                                                data["DESCRIPTION"] = "";

                                            var values = headers.Select(h => {
                                                string val = data.ContainsKey(h) ? data[h] : "";
                                                return string.IsNullOrWhiteSpace(val) ? "N/A" : val;
                                            }).ToList();

                                            // Thread-safe CSV writing
                                            lock (csvLock)
                                            {
                                                writer.WriteLine(string.Join(",", values.Select(EscapeCsv)));
                                            }

                                            jobRows.Add(new ValidationRow {
                                                JobId = jobId,
                                                JobName = jobName,
                                                FileName = fileNameOnly,
                                                PartNo = evaluatedPartNo,
                                                Description = data.ContainsKey("DESCRIPTION") ? data["DESCRIPTION"] : ""
                                            });

                                            Interlocked.Increment(ref totalFileCount);
                                        }
                                    }

                                    if (jobRows.Count > 0)
                                    {
                                        int inserted = await InsertToAzureSqlAsync(jobRows, jobId);
                                        Interlocked.Add(ref totalSqlInserted, inserted);
                                    }
                                }
                            }

                            // Update Progress
                            int currentProgress = Interlocked.Increment(ref completedJobs);
                            double percent = (double)currentProgress / jobFolders.Count;
                            Console.WriteLine($"[{currentProgress}/{jobFolders.Count}] ({percent:P0}) Compl: {jobFolder}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error processing job folder '{jobFolder}': {ex.Message}");
                        }
                    });
                }

                Console.WriteLine("----------------------------------");
                Console.WriteLine("Scan complete.");
                Console.WriteLine("Total Job Folders Processed  : " + jobFolderCount);
                Console.WriteLine("Total Assemblies Processed   : " + totalFileCount);
                Console.WriteLine("Total Rows Inserted to Azure : " + totalSqlInserted);
                Console.WriteLine("CSV saved to                 : " + Path.GetFullPath(OUTPUT_CSV));
            }
            catch (Exception ex)
            {
                Console.WriteLine("A critical error occurred: " + ex.Message);
            }
        }

        public class ValidationRow {
            public string JobId { get; set; } = "";
            public string JobName { get; set; } = "";
            public string FileName { get; set; } = "";
            public string PartNo { get; set; } = "";
            public string Description { get; set; } = "";
        }

        public class ValidationResult {
            public List<string> Errors { get; set; } = new List<string>();
            public List<string> Warnings { get; set; } = new List<string>();
        }

        static async Task ClearAzureSqlTableAsync()
        {
            try
            {
                Console.WriteLine($"Clearing Azure SQL table: {SQL_TABLE}");
                await using var conn = new SqlConnection(CONNECTION_STRING);
                await conn.OpenAsync();
                await using var cmd = new SqlCommand($"TRUNCATE TABLE [{SQL_TABLE}];", conn);
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"Azure SQL: Table '{SQL_TABLE}' truncated.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error clearing Azure SQL table: {ex.Message}");
            }
        }

        static async Task<int> InsertToAzureSqlAsync(List<ValidationRow> rows, string jobId)
        {
            int totalInserted = 0;
            string tempTableName = $"#Temp_{Guid.NewGuid():N}";
            try
            {
                var table = new DataTable();
                table.Columns.Add("job_id",           typeof(string));
                table.Columns.Add("job_name",         typeof(string));
                table.Columns.Add("file_name",        typeof(string));
                table.Columns.Add("partno",           typeof(string));
                table.Columns.Add("description",      typeof(string));

                foreach (var r in rows)
                    table.Rows.Add(r.JobId, r.JobName, r.FileName, r.PartNo, r.Description);

                await using var conn = new SqlConnection(CONNECTION_STRING);
                await conn.OpenAsync();

                // 1. Create a local temporary table with the same schema
                string createTempTable = $@"
                    CREATE TABLE {tempTableName} (
                        job_id NVARCHAR(50),
                        job_name NVARCHAR(255),
                        file_name NVARCHAR(255),
                        partno NVARCHAR(255),
                        description NVARCHAR(MAX)
                    );";
                await using (var cmd = new SqlCommand(createTempTable, conn)) {
                    await cmd.ExecuteNonQueryAsync();
                }

                // 2. Bulk copy into the temporary table
                using (var bulkCopy = new SqlBulkCopy(conn)) {
                    bulkCopy.DestinationTableName = tempTableName;
                    bulkCopy.ColumnMappings.Add("job_id",           "job_id");
                    bulkCopy.ColumnMappings.Add("job_name",         "job_name");
                    bulkCopy.ColumnMappings.Add("file_name",        "file_name");
                    bulkCopy.ColumnMappings.Add("partno",           "partno");
                    bulkCopy.ColumnMappings.Add("description",      "description");
                    await bulkCopy.WriteToServerAsync(table);
                }

                // 3. MERGE upsert:
                //    - MATCHED + scanner got a real description  → update job_name + description
                //    - MATCHED + scanner got empty description   → leave row untouched (file was locked)
                //    - NOT MATCHED                               → insert new row
                //    Web-app-only fields (comments, preference, sdc_standard, etc.) are never overwritten.
                string mergeSql = $@"
                    MERGE [{SQL_TABLE}] AS target
                    USING {tempTableName} AS source
                       ON (    target.job_id   = source.job_id
                           AND target.file_name = source.file_name
                           AND target.partno    = source.partno)
                    WHEN MATCHED AND source.description IS NOT NULL AND source.description <> '' THEN
                        UPDATE SET
                            target.job_name    = source.job_name,
                            target.description = source.description
                    WHEN NOT MATCHED BY TARGET THEN
                        INSERT (job_id, job_name, file_name, partno, description)
                        VALUES (source.job_id, source.job_name, source.file_name, source.partno, source.description);
                    SELECT @@ROWCOUNT;";

                await using (var cmd = new SqlCommand(mergeSql, conn)) {
                    totalInserted = (int)await cmd.ExecuteScalarAsync();
                }

                // 4. Drop the temp table
                await using (var cmd = new SqlCommand($"DROP TABLE {tempTableName};", conn)) {
                    await cmd.ExecuteNonQueryAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Azure SQL incremental insert failed for Job {jobId}: {ex.Message}");
            }
            return totalInserted;
        }

        static ValidationResult ExtractAndValidate(SwDMApplication dmApp, string filePath, Dictionary<string, string> data)
        {
            var result = new ValidationResult();
            string fileNameOnly = Path.GetFileNameWithoutExtension(filePath);

            try
            {
                SwDmDocumentOpenError err;
                SwDMDocument30? doc = dmApp.GetDocument(filePath, SwDmDocumentType.swDmDocumentAssembly, true, out err) as SwDMDocument30;

                if (doc != null && err == SwDmDocumentOpenError.swDmDocumentOpenErrorNone)
                {
                    // 1. Part Number Format Validation
                    // Pattern: ^[0-9]+-[A-Z]+-000(-[0-9]+)?$
                    var pnMatch = Regex.Match(fileNameOnly, @"^(\d+)-([A-Z]+)-000(?:-(\d+))?$");
                    if (!pnMatch.Success)
                    {
                        result.Errors.Add("Part Number does not match pattern '###-XXX-000'");
                    }
                    else
                    {
                        string letters = pnMatch.Groups[2].Value;
                        if (letters.Contains("P") || letters.Contains("V"))
                            result.Errors.Add("Part Number letters cannot contain 'P' or 'V'");

                        if (letters.Length == 4) result.Warnings.Add("4-letter depth (5th level) should be avoided");
                        if (letters.Length >= 5) result.Errors.Add("5+ letter depth is prohibited");
                    }

                    // 2. PartNo Property Check
                    string rawPartNo = GetSafeProperty(doc, "PartNo", out bool isConfigSpecific, out bool existsOnCustom);
                    string evaluatedPartNo = EvaluateProperty(rawPartNo, fileNameOnly);

                    // Fallback to filename if property is null/empty
                    if (string.IsNullOrWhiteSpace(evaluatedPartNo))
                    {
                        evaluatedPartNo = fileNameOnly;
                    }
                    data["PartNo"] = evaluatedPartNo;

                    if (string.IsNullOrWhiteSpace(rawPartNo))
                    {
                        result.Warnings.Add("PartNo property is missing or empty; using filename as fallback.");
                    }
                    else if (evaluatedPartNo != fileNameOnly)
                    {
                        result.Errors.Add($"PartNo evaluated value '{evaluatedPartNo}' does not match filename '{fileNameOnly}'");
                    }

                    if (existsOnCustom)
                    {
                        result.Warnings.Add("PartNo property is on Custom tab (should be Configuration Specific)");
                    }

                    // 3. Description Property Validation
                    string rawDescription = GetSafeProperty(doc, "DESCRIPTION", out _, out _);
                    string description = EvaluateProperty(rawDescription, fileNameOnly);
                    data["DESCRIPTION"] = description;

                    if (string.IsNullOrWhiteSpace(description))
                    {
                        result.Errors.Add("Description is missing or empty");
                    }
                    else
                    {
                        if (!description.EndsWith("ASSY")) result.Errors.Add("Description must end in 'ASSY'");
                        if (description.Length > 60) result.Warnings.Add("Description exceeds 60 character limit");
                        if (Regex.IsMatch(description, "[a-z]")) result.Errors.Add("Description contains lowercase characters");

                        bool hasSPrefix = Regex.IsMatch(description, @"^S\d+-");
                        bool hasDSPrefix = Regex.IsMatch(description, @"^D\d+-S\d+-");
                        bool hasAPrefix = Regex.IsMatch(description, @"^A\d+-");
                        bool isTopLevel = Regex.IsMatch(fileNameOnly, @"^\d+-A-000$");

                        if (isTopLevel)
                        {
                            if (!hasSPrefix && !hasDSPrefix && !hasAPrefix)
                                result.Warnings.Add("Top-level assembly missing S#-, D#-S#-, or A#- prefix");
                        }
                        else
                        {
                            if (hasSPrefix || hasDSPrefix || hasAPrefix)
                                result.Warnings.Add("Lower-level assembly should not have station/group prefixes");
                        }
                    }

                    doc.CloseDoc();
                }
                else
                {
                    string errReason = err switch {
                        SwDmDocumentOpenError.swDmDocumentOpenErrorFileNotFound     => "File not found",
                        SwDmDocumentOpenError.swDmDocumentOpenErrorNonSW            => "Not a SolidWorks file",
                        SwDmDocumentOpenError.swDmDocumentOpenErrorFutureVersion    => "File is a newer SW version",
                        SwDmDocumentOpenError.swDmDocumentOpenErrorNeedsRepair      => "File needs repair",
                        _ => err.ToString()
                    };
                    // E_FAIL / swDmDocumentOpenErrorUnknown most often means the file is open/locked in SolidWorks
                    Console.WriteLine($"  [WARN] Cannot read '{Path.GetFileName(filePath)}' — {errReason} (description will stay NULL until next scan when file is closed)");
                    result.Errors.Add($"Could not open SW file: {errReason}");
                    if (doc != null) doc.CloseDoc();
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Validation Exception: {ex.Message}");
            }

            // Ensure PartNo fallback if still missing
            if (!data.ContainsKey("PartNo") || string.IsNullOrWhiteSpace(data["PartNo"]))
            {
                data["PartNo"] = fileNameOnly;
            }

            return result;
        }

        static string GetSafeProperty(SwDMDocument30 doc, string propertyName, out bool isConfigSpecific, out bool existsOnCustom)
        {
            isConfigSpecific = false;
            existsOnCustom = false;
            SwDmCustomInfoType type;

            // Check Configuration Specific first
            var configMgr = doc.ConfigurationManager;
            string[]? configNames = configMgr.GetConfigurationNames() as string[];
            if (configNames != null && configNames.Length > 0)
            {
                var config = configMgr.GetConfigurationByName(configNames[0]) as SwDMConfiguration;
                if (config != null)
                {
                    string? cfgVal = config.GetCustomProperty(propertyName, out type) as string;
                    if (!string.IsNullOrEmpty(cfgVal))
                    {
                        isConfigSpecific = true;
                        return cfgVal;
                    }
                }
            }

            // Check Custom
            string? customVal = doc.GetCustomProperty(propertyName, out type) as string;
            if (!string.IsNullOrEmpty(customVal))
            {
                existsOnCustom = true;
                return customVal;
            }

            return "";
        }

        static string EvaluateProperty(string rawValue, string fileName)
        {
            if (string.IsNullOrEmpty(rawValue)) return "";
            if (!IsExpression(rawValue)) return rawValue;

            // Handle $PRP:"SW-File Name"
            if (rawValue.Contains("SW-File Name"))
            {
                return fileName;
            }

            // General PRP cleanup (strip $PRP:"...")
            var match = Regex.Match(rawValue, @"\$PRP:\""(.+)\""");
            if (match.Success) return match.Groups[1].Value;

            return rawValue;
        }

        static bool IsExpression(string val)
        {
            return val.Contains("$PRP") || val.Contains("$PRPMODEL") || val.Contains("$PRPSHEET") || val.Contains("$PRPVIEW");
        }

        static IEnumerable<string> SafeGetDirectories(string path)
        {
            try { return Directory.GetDirectories(path); }
            catch { return Enumerable.Empty<string>(); }
        }

        static IEnumerable<string> SafeGetFiles(string path, string searchPattern)
        {
            var files = new List<string>();
            try
            {
                files.AddRange(Directory.GetFiles(path, searchPattern));
                foreach (var directory in Directory.GetDirectories(path))
                    files.AddRange(SafeGetFiles(directory, searchPattern));
            }
            catch { }
            return files;
        }

        static string EscapeCsv(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r"))
                return "\"" + value.Replace("\"", "\"\"") + "\"";
            return value;
        }
    }
}