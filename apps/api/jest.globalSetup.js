const { execSync } = require('child_process')
const path = require('path')

module.exports = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for Jest setup')
  }

  // Run Prisma migrations to ensure schema exists
  try {
    execSync('pnpm db:migrate', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
      env: process.env,
    })
    console.log('Prisma migrations completed successfully')
  } catch (error) {
    console.error('Failed to run Prisma migrations:', error)
    throw error
  }

  // Run seed data
  try {
    execSync('pnpm db:seed', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
      env: process.env,
    })
    console.log('Database seeded successfully')
  } catch (error) {
    console.error('Failed to seed database:', error)
    throw error
  }
}
