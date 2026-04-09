using System;
using Microsoft.Data.SqlClient;
using System.Threading.Tasks;

class Program
{
    static readonly string CONNECTION_STRING = "Server=tcp:solidworksserver.database.windows.net,1433;Initial Catalog=free-sql-db-9499891;User ID=akamuju;Password=Voltages84gilds$;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;";

    static async Task Main()
    {
        try
        {
            await using var conn = new SqlConnection(CONNECTION_STRING);
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT COUNT(*) FROM solidworks_assemblies_testing", conn);
            int count = (int)await cmd.ExecuteScalarAsync();
            Console.WriteLine("Table row count: " + count);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
    }
}
