// Parsing regexes
// Parse a todo like:
// [2]>13872a7f716e76 Todo text
// [-4] Todo text
// first group is priority, second is completion (optional),
// Third is note hash (optional), fourth is text
const todoRegexp = /^\[(?<priority>(?<completed>-)*\d)\](?<notehash>>[\dA-Za-z]+)*\s(?<text>.*)$/;

class Todo {
  // Sorting function to be consumed by Array.prototype.sort
  static sort(todo1, todo2) {
    // Separate by completion
    if (todo1.completed && todo2.completed) return 0;
    if (todo1.completed && !todo2.completed) return 1;
    if (!todo1.completed && todo2.completed) return -1;
    // Sort by priority
    if (todo1.priority === 0) return 1;
    if (todo1.priority > todo2.priority) return 1;
    if (todo1.priority < todo2.priority) return -1;
    // If priority is the same sort by text alphabetically
    if (todo1.text > todo2.text) return 1;
    if (todo1.text < todo2.text) return -1;
    return 0;
  }

  static filename() {
    return 'todo';
  }

  constructor(arg) {
    if (typeof arg === 'string') {
      const m = arg.match(todoRegexp);
      this.priority = Math.abs(parseInt(m.groups.priority, 10));
      this.completed = m.groups.completed === '-';
      this.notehash = m.groups.notehash ? m.groups.notehash.slice(1) : null;
      this.text = m.groups.text;
    } else if (typeof arg === 'object') {
      if (arg === null) throw new Error('Invalid argument passed to constructor');
      this.priority = arg.priority;
      this.completed = arg.completed;
      this.notehash = arg.notehash;
      this.text = arg.text;
    } else throw new Error('Invalid argument passed to constructor');
  }


  set priority(num) {
    if (num < 0 || num > 9) {
      throw new Error('priority must be between 0 and 9');
    }
    this.privatepriority = num;
  }

  get priority() {
    return this.privatepriority;
  }

  toString() {
    return `[${this.completed ? '-' : ''}${this.priority}]${this.notehash != null ? `>${this.notehash}` : ''} ${this.text}`;
  }
}

module.exports = Todo;
