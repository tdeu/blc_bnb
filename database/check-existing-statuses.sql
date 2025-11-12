-- Check what status values currently exist in your table
SELECT DISTINCT status, COUNT(*) as count
FROM approved_markets
GROUP BY status
ORDER BY count DESC;
