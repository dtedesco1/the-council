import fs from 'fs';
import { execSync } from 'child_process';

// Use basic relative path assuming CWD is project root
const envPath = '.env';

if (!fs.existsSync(envPath)) {
    console.error('No .env file found!');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');

const parseEnv = (src) => {
    const result = {};
    const lines = src.split('\n');
    let currentKey = null;
    let currentValue = '';
    let inQuote = false;

    for (const line of lines) {
        if (!currentKey && (line.trim().startsWith('#') || !line.trim())) continue;

        if (!currentKey) {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if (value.startsWith("'")) {
                    inQuote = true;
                    value = value.substring(1);
                }

                if (inQuote && value.endsWith("'") && value !== "'") {
                    inQuote = false;
                    value = value.slice(0, -1);
                }

                if (inQuote) {
                    currentKey = key;
                    currentValue = value;
                } else {
                    result[key] = value;
                }
            }
        } else {
            let val = line;
            if (val.trim().endsWith("'")) {
                inQuote = false;
                val = val.substring(0, val.lastIndexOf("'"));
                currentValue += '\n' + val;
                result[currentKey] = currentValue;
                currentKey = null;
                currentValue = '';
            } else {
                currentValue += '\n' + val;
            }
        }
    }
    return result;
};

const env = parseEnv(content);
const keys = Object.keys(env);

console.log(`Found ${keys.length} keys: ${keys.join(', ')}`);

const targets = ['production', 'preview', 'development'];

const upload = (key, val) => {
    // Clean up previous value just in case
    targets.forEach(target => {
        try { execSync(`vercel env rm ${key} ${target} -y`, { stdio: 'ignore' }); } catch (e) { }
    });

    console.log(`Uploading ${key}...`);
    fs.writeFileSync('temp_val.txt', val);

    targets.forEach(target => {
        try {
            execSync(`cat temp_val.txt | vercel env add ${key} ${target}`, { stdio: 'pipe' });
            process.stdout.write(`V `);
        } catch (e) {
            process.stdout.write(`X `);
        }
    });
    console.log('');
};

keys.forEach(k => upload(k, env[k]));

try { fs.unlinkSync('temp_val.txt'); } catch (e) { }
