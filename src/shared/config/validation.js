const requiredEnvVars = [
  'MONGODB_URL',
  'JWT_SECRET',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
  'NODE_ENV',
];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  console.log('✅ Environment variables validated successfully');
};
