import * as fs from "fs/promises";

const MEMORY_CAPACITY = 1024; // 1Kb

enum OpKind {
  INCREMENT,
  DECREMENT,
  LEFT,
  RIGHT,
  INPUT,
  OUTPUT,
  JUMP_IF_ZERO,
  JUMP_IF_NONZERO,
}

type Op = {
  kind: OpKind;
  operand: number; // Number of OpKind to operate
};

if (process.argv.length <= 2) {
  throw new Error("No input file provided");
}

async function getInput(): Promise<Buffer> {
  return new Promise((res, rej) => {
    process.on("data", (chunk) => {
      res(chunk);
    });
  });
}

async function main(sourceFile: string) {
  const input = await getInput();
  const code = await fs.readFile(sourceFile, "utf-8");
  const ops: Op[] = [];

  let prevChar = "";
  const validChars = "><+-.,[]";

  let charToOp: Record<string, OpKind> = {
    ">": OpKind.RIGHT,
    "<": OpKind.LEFT,
    "+": OpKind.INCREMENT,
    "-": OpKind.DECREMENT,
    ".": OpKind.OUTPUT,
    ",": OpKind.INPUT,
    "[": OpKind.JUMP_IF_ZERO,
    "]": OpKind.JUMP_IF_NONZERO,
  };

  let dataPointer = 0;
  let instructionPointer = 0;
  let inputPointer = 0;

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
          throw new Error(
            "Negative value provided for memory cell : " + dataPointer
          );
        }

        memory[dataPointer]--;
        break;

      case ".":
        process.stdout.write(String.fromCharCode(memory[dataPointer]));
        break;

      case ",":
        if (inputPointer >= input.length) {
          throw new Error("No more value to read from input");
        }

        memory[dataPointer] = input[inputPointer];
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
        let count = 1;
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
          // throw new Error("No matching b")
        }
      } else {
        loopStack.push(instructionPointer);
        execute(char);
      }
    }

    if (char == "]") {
      if (memory[dataPointer] == 0) {
        loopStack.pop();
        execute(char);
      } else {
        loopStack[loopStack.length - 1]
      }
    }

    if (char != "[" && char != "]") {
      if (prevChar == char) {
        ops[ops.length - 1].operand++;
        continue;
      }

      ops.push({
        kind: charToOp[char],
        operand: 1,
      });
    } else {
    }

    prevChar = char;
  }

  console.log(ops);
}

main(process.argv[2]).catch((err) => console.error(err));
