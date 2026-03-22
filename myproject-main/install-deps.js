const { spawn } = require('child_process');
const path = require('path');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const projects = [
  { name: 'backend', cwd: path.join(__dirname, 'backend') },
  { name: 'frontend', cwd: path.join(__dirname, 'frontend') }
];

function installProject(project) {
  return new Promise((resolve, reject) => {
    console.log(`Installing dependencies in ${project.name}...`);

    const child = spawn(npm, ['install'], {
      cwd: project.cwd,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm install failed in ${project.name}`));
    });
  });
}

async function main() {
  for (const project of projects) {
    await installProject(project);
  }

  console.log('Dependencies installed for backend and frontend.');
  console.log('Start the app with: cd backend && npm run migrate && npm start');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
