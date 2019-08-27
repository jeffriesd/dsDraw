class DictionaryCommand extends ConsoleCommand {
  constructor(receiver, ...args) {
    super(...args);
    this.receiver = receiver;
  }
}

class DictionaryKeysCommand extends DictionaryCommand {
  executeSelf() {
    return Array.from(this.receiver.keys());
  }
}

class DictionaryValuesCommand extends DictionaryCommand {
  executeSelf() {
    return Array.from(this.receiver.values());
  }
}

class DictionaryDeleteCommand extends DictionaryCommand {
  executeChildren() {
    super.executeChildren();
    this.deleteKey = this.args[0];
  }

  checkArguments() {
    this.receiver.checkKeyValue(this.deleteKey);
    if (this.receiver.has(this.deleteKey)) return;
    throw `No dictionary entry for key ${this.deleteKey}`;
  }

  executeSelf() {
    if (this.oldEntry == undefined) 
      this.oldEntry = this.receiver.get(this.deleteKey);
    this.receiver.delete(this.deleteKey);
  }

  undo() {
    this.receiver.set(this.deleteKey, this.oldEntry);
  }
}