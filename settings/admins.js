// Admin users configuration - loaded by admin pages
window.GH_ADMINS = {
    version: 1,
    updatedAt: "2025-10-25T00:00:00.000Z",
    admins: [
        {
            username: "admin",
            passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
            roles: ["admin"]
        },
        {
            username: "admin2",
            passwordHash: "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9",
            roles: ["admin"]
        },
        {
            username: "admin3",
            passwordHash: "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
            roles: ["admin"]
        },
        {
            username: "deneme2",
            passwordHash: "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
            roles: ["patientAdmin"]
        }
    ],
    patientAdmins: []
};

console.info('[GH_ADMINS] Loaded', GH_ADMINS.admins.length, 'admins');