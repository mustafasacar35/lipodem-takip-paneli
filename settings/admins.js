// Admins configuration (can be overridden by remote GitHub version)
window.GH_ADMINS = {
  version: 1,
  updatedAt: "2025-10-25T00:00:00.000Z",
  admins: [
    {
      username: "admin",
      passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
      roles: ["admin"]
    }
  ],
  // Optional: grant admin rights to patient usernames; validated via PatientAuth when served over http/https
  patientAdmins: [
    // "deneme"
  ]
};
