// Admin users configuration - loaded by admin pages
window.GH_ADMINS = {
    version: 1,
    updatedAt: new Date().toISOString(),
    admins: [
        {
            username: "admin",
            password: "admin123",
            role: "SuperAdmin",
            name: "Ana Yönetici"
        },
        {
            username: "admin2",
            password: "2222",
            role: "Admin",
            name: "İkinci Yönetici"
        }
    ],
    patientAdmins: [
        {
            username: "deneme2",
            password: "1111",
            role: "PatientAdmin",
            name: "Hasta Yöneticisi"
        }
    ]
};

console.info('[GH_ADMINS] Loaded', GH_ADMINS.admins.length, 'admins and', GH_ADMINS.patientAdmins.length, 'patient admins');