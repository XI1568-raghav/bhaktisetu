# apps\api\src\lib\alert.ts

- AlertSeverity · type · L17-L17 — type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
- OpsAlertParams · interface · L19-L23 — interface OpsAlertParams
- OpsAlertResult · interface · L25-L30 — interface OpsAlertResult
- postSlack · function · L39-L68 — async function postSlack( webhookUrl: string, params: OpsAlertParams, ): Promise<OpsAlertResult>
- postEmail · function · L70-L100 — async function postEmail( recipients: string[], params: OpsAlertParams, ): Promise<OpsAlertResult>
- sendOpsAlert · function · L102-L122 — async function sendOpsAlert( params: OpsAlertParams, ): Promise<OpsAlertResult>
