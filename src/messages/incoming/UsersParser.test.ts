import { BinaryWriter } from "../../protocol/binary.ts";
import { PacketReader } from "../../protocol/wrapper.ts";
import { UsersParser } from "./UsersParser.ts";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

function writeString(writer: BinaryWriter, value: string): void {
  writer.writeString(value);
}

function writeUser(writer: BinaryWriter, input: { id: number; name: string; figure: string; index: number; sex: string }): void {
  writer.writeInt(input.id);
  writeString(writer, input.name);
  writeString(writer, "hi");
  writeString(writer, input.figure);
  writer.writeInt(input.index);
  writer.writeInt(1);
  writer.writeInt(2);
  writeString(writer, "0");
  writer.writeInt(2);
  writer.writeInt(1);
  writeString(writer, input.sex);
  writer.writeInt(0);
  writer.writeInt(0);
  writeString(writer, "");
  writeString(writer, "");
  writer.writeInt(0);
  writer.writeByte(0);
}

function writePet(writer: BinaryWriter, input: { id: number; name: string; index: number; owner: string }): void {
  writer.writeInt(input.id);
  writeString(writer, input.name);
  writeString(writer, "");
  writeString(writer, "1 2 3");
  writer.writeInt(input.index);
  writer.writeInt(3);
  writer.writeInt(4);
  writeString(writer, "0");
  writer.writeInt(0);
  writer.writeInt(2);
  writer.writeInt(12);
  writer.writeInt(7);
  writeString(writer, input.owner);
  writer.writeInt(0);
  writer.writeByte(1);
  writer.writeByte(0);
  writer.writeByte(0);
  writer.writeByte(0);
  writer.writeByte(0);
  writer.writeByte(0);
  writer.writeByte(0);
  writer.writeInt(1);
  writeString(writer, "std");
}

const writer = new BinaryWriter();
writer.writeInt(3);
writeUser(writer, { id: 11, name: "Alice", figure: "hd-1", index: 10, sex: "f" });
writePet(writer, { id: 99, name: "Doggo", index: 11, owner: "PetOwnerName" });
writeUser(writer, { id: 22, name: "Bob", figure: "hd-2", index: 12, sex: "m" });

const parsed = new UsersParser().parse(new PacketReader(374, writer.toArrayBuffer()));
assert(parsed.length === 3, `expected 3 units, got ${parsed.length}`);
assert(parsed[0]?.name === "Alice" && parsed[0]?.sex === "f" && parsed[0]?.gender === "f", "first user should keep sex/gender");
assert(parsed[1]?.name === "Doggo" && parsed[1]?.type === 2, "pet should stay aligned");
assert(parsed[2]?.name === "Bob" && parsed[2]?.sex === "m" && parsed[2]?.gender === "m", "user after pet should keep sex/gender");

console.log("UsersParser: ok");
