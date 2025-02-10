const axios = require('axios');
const fs = require('fs');
const semver = require('semver');
const path = require('path');

const NPM_REGISTRY = "https://registry.npmjs.org";
const PYPI_API = "https://pypi.org/pypi";

async function checkNpmDependencies(filePath) {
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const dependencies = packageJson.dependencies;
  const results = [];

  for (let packageName in dependencies) {
    const currentVersion = dependencies[packageName].replace("^", "").replace("~", "");
    try {
      const response = await axios.get(`${NPM_REGISTRY}/${packageName}`);
      const latestVersion = response.data["dist-tags"].latest;
      if (semver.lt(currentVersion, latestVersion)) {
        results.push({ package: packageName, currentVersion, latestVersion });
      }
    } catch (error) {
      console.error(`Failed to fetch info for ${packageName}`);
    }
  }

  return results;
}

async function checkPipDependencies(filePath) {
  const results = [];
  const dependencies = fs.readFileSync(filePath, 'utf8').split('\n');

  for (let dep of dependencies) {
    const [package, version] = dep.split('==');
    if (package && version) {
      try {
        const response = await axios.get(`${PYPI_API}/${package}/json`);
        const latestVersion = response.data.info.version;
        if (semver.lt(version, latestVersion)) {
          results.push({ package, currentVersion: version, latestVersion });
        }
      } catch (error) {
        console.error(`Failed to fetch info for ${package}`);
      }
    }
  }

  return results;
}

async function scanDependencies(directory) {
  console.log("\n📦 Scanning dependencies...\n");

  const npmFile = path.join(directory, 'package.json');
  const pipFile = path.join(directory, 'requirements.txt');

  if (fs.existsSync(npmFile)) {
    console.log("🔍 Checking NPM dependencies...");
    const npmResults = await checkNpmDependencies(npmFile);
    npmResults.forEach(({ package, currentVersion, latestVersion }) => {
      console.log(`❌ ${package} (${currentVersion}) → (Latest: ${latestVersion})`);
    });
  }

  if (fs.existsSync(pipFile)) {
    console.log("\n🔍 Checking Python dependencies...");
    const pipResults = await checkPipDependencies(pipFile);
    pipResults.forEach(({ package, currentVersion, latestVersion }) => {
      console.log(`❌ ${package} (${currentVersion}) → (Latest: ${latestVersion})`);
    });
  }

  if (!npmResults.length && !pipResults.length) {
    console.log("✅ All dependencies are up to date!");
  }
}

const directory = process.argv[2] || '.';
scanDependencies(directory);
