const { exit } = require('process');
const childProcess = require('child_process');

const argOptions = ['--json'];

const addDependencies = (dependency, dependencies, uniqueDependencies) => {
    if (!Object.keys(dependency).includes('dependencies')) {
        return;
    }
    for (const subDependency of Object.keys(dependency['dependencies'])) {
        if (!dependencies.has(subDependency)) {
            dependencies.add(subDependency);
            uniqueDependencies.add(subDependency);
        } else {
            uniqueDependencies.delete(subDependency);
        }
        addDependencies(
            dependency['dependencies'][subDependency], dependencies, uniqueDependencies
        );

    };
    return;
}

const countSubdepencies = (dependency, uniqueDependencies) => {
    if (!Object.keys(dependency).includes('dependencies')) {
        return [0, 0];
    }
    let countTotal = 0;
    let countUnique = 0;
    for (const subDependency of Object.keys(dependency['dependencies'])) {
        countTotal++;
        if (uniqueDependencies.has(subDependency)) {
            countUnique++;
        }
        const subdependencyCounts = countSubdepencies(
            dependency['dependencies'][subDependency], uniqueDependencies
        );
        countTotal += subdependencyCounts[0];
        countUnique += subdependencyCounts[1];
    };
    return [countTotal, countUnique];
}

const outputTopLevelSubdependecyCounts = (subdependencyCounts, args) => {
    if (!(args.includes('--json'))) {
        for (const [toplevelDepedency, statistics] of subdependencyCounts.entries()) {
            console.log(
                `
                ${toplevelDepedency}:
                    Total Subdependencies: ${statistics['totalDependencies']}
                    Unique Subdependencies: ${statistics['uniqueDependencies']}
                `
            );
        }
    } else {
        console.log(
            JSON.stringify(
                Object.fromEntries(subdependencyCounts.entries()),
                undefined,
                2
            )
        );
    }
}

const parseDepedencyStats = (statsJson) => {
    const dependencies = new Set();
    const uniqueDependencies = new Set();
    const subdependencyCounts = new Map();
    const dependenciesJson = (JSON.parse(statsJson))['dependencies'];
    
    if (dependenciesJson === undefined) {
        console.log('No dependencies could be detected');
        return;
    }
    
    for (const dependency of Object.keys(dependenciesJson)) {
        dependencies.add(dependency);
        uniqueDependencies.add(dependency);
        addDependencies(
            dependenciesJson[dependency], dependencies, uniqueDependencies
        );
    }
    for (const dependency of Object.keys(dependenciesJson)) {

        const subdepencyCount = countSubdepencies(
            dependenciesJson[dependency], uniqueDependencies
        );
        subdependencyCounts.set(dependency, {
            'totalDependencies': subdepencyCount[0],
            'uniqueDependencies': subdepencyCount[1]
        })
    }
    outputTopLevelSubdependecyCounts(subdependencyCounts, args);
}

const printHelp = () => {
    console.log('Usage: node getDependencyStats.js [options]')
    console.log('   --json:  Output JSON');
}

const args = process.argv.slice(2);

for (const arg of args) {
    if (!argOptions.includes(arg)) {
        printHelp();
        exit(0);
    }
}

childProcess.exec('npm ls --all --json', (error, stdout, stderr) => {
    if (error) {
        console.log(`${error}`)
    }
    else {
        parseDepedencyStats(stdout, args);
    }
});
