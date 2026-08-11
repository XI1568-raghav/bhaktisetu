# apps\web\app\csr-match\page.tsx

Dev-only CSR donation-match landing page that markets a 2x corporate match on employee temple-adoption pledges and captures qualified CSR leads via a calculator, transparency preview, and 4-field signup form.

- formatINR · function · L9-L11 — Formats pledge amounts as Indian-locale rupee strings for display in the match calculator.
- CsrMatchPage · function · L21-L207 — Renders the CSR match landing page whose central selling point is the 2x match rule: every employee rupee pledged is doubled by corporate CSR funds to show total impact.
- onSubmit · function · L35-L58 — Submits the corporate signup as a structured lead (company, CSR head email, budget bracket, match cap) to the csr-match leads API and surfaces success or failure to the user.
