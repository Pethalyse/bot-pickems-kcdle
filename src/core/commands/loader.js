import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {Command} from "./Command.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadCommands(deps) {
    const dir = path.resolve(__dirname, './load');
    const files = (await readdir(dir)).filter(f => f.endsWith('.js'));
    const commands = new Map();

    for (const f of files) {
        const mod = await import(path.join(dir, f));
        const Cmd = mod.default;
        if (!Cmd) {
            console.warn(`⚠️ ${f}: no default export class found`);
            continue;
        }
        const instance = new Cmd(deps);

        if (!instance?.data || !instance?.name) {
            throw new Error(`Command file "${f}" must set "this.data" (SlashCommandBuilder) with a valid name`);
        }
        commands.set(instance.data.name, instance);
    }
    return commands;
}
