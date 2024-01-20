import * as fs from "fs/promises";

const MEMORY_CAPACITY = 1024; // 1Kb
const argc = process.argv.length;

if (argc <= 2) {
  throw new Error("No input file provided");
}

if (argc > 3) {
  throw new Error("Invalid number of arguments provided");
}

async function readOrUse(path: string) {
  try {
    return await fs.readFile(path, "utf-8");
  } catch {
    return path;
  }
}

async function getInput(): Promise<Buffer> {
  return new Promise((res, rej) => {
    process.stdin.on("data", (chunk) => res(chunk));
    const input = process.stdin.read();
  });
}

async function main(sourceFile: string) {
  const input = await getInput();
  const output: number[] = [];
  const code = await readOrUse(sourceFile);

  const validChars = "><+-.,[]";
  let dataPointer = 0;
  let instructionPointer = 0;
  let inputPointer = 0;
  let brackets = new Map<number, number>();

  const memory = new Array<number>(MEMORY_CAPACITY).fill(0);

  // stack for [ and ] instructions
  const loopStack = [];

  const execute = (command: string) => {
    switch (command) {
      case ">":
        if (dataPointer == MEMORY_CAPACITY - 1) {
          throw new Error(
            "Buffer overflow : only " + MEMORY_CAPACITY + " were allocated"
          );
        }

        dataPointer++;
        break;

      case "<":
        if (dataPointer == 0) {
          throw new Error("Buffer overflow");
        }

        dataPointer--;
        break;

      case "+":
        while (memory[dataPointer] == 0xff) {
          if (dataPointer == MEMORY_CAPACITY - 1) {
            throw new Error(
              "Buffer overflow : only " + MEMORY_CAPACITY + " were allocated"
            );
          }
          dataPointer++;
        }

        memory[dataPointer]++;

        break;

      case "-":
        if (memory[dataPointer] == 0) {
          memory[dataPointer] = 0xff;
        } else {
          memory[dataPointer]--;
        }

        break;

      case ".":
        output.push(memory[dataPointer]);
        break;

      case ",":
        if (inputPointer < input.length) {
          memory[dataPointer] = input[inputPointer++];
        }

        break;

      default:
        break;
    }
  };

  for (; instructionPointer < code.length; ++instructionPointer) {
    const char = code[instructionPointer];
    if (!validChars.includes(char)) {
      continue;
    }

    if (char == "[") {
      if (memory[dataPointer] == 0) {
        if (brackets.has(instructionPointer)) {
          instructionPointer = brackets.get(instructionPointer)!;
        } else {
          let count = 1;
          const origin = instructionPointer++;

          for (
            ;
            count > 0 && instructionPointer < code.length;
            ++instructionPointer
          ) {
            const char = code[instructionPointer];
            if (char == "[") {
              count++;
            }
            if (char == "]") {
              count--;
            }
          }

          if (count != 0) {
            throw new Error(
              "No matching pair for brackets at " + instructionPointer
            );
          } else {
            brackets.set(origin, instructionPointer - 1);
          }
        }
      } else {
        loopStack.push(instructionPointer);
      }
    } else if (char == "]") {
      if (memory[dataPointer] == 0) {
        loopStack.pop();
      } else {
        instructionPointer = loopStack[loopStack.length - 1];
      }
    } else {
      execute(char);
    }
  }

  if (output.length > 0) {
    console.log(String.fromCharCode(...output));
  }
}

main(process.argv[2]).catch((err) => console.error(err));
