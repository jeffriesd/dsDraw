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
  getChildValues() {
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

  saveState() {
    var prevEntry = undefined;
    if (this.receiver.has(this.deleteKey))
      prevEntry = this.receiver.get(this.deleteKey);
    return {
      previousEntry : prevEntry,
    };
  }

  restoreState(state) {
    if (state.previousEntry !== undefined)
      this.receiver.set(this.deleteKey, state.previousEntry);
    else
      this.receiver.delete(this.deleteKey);
  }

  // undoSelf() {
  //   this.receiver.set(this.deleteKey, this.oldEntry);
  // }
}