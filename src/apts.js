const {
  format,
  isSameWeek,
  isSameDay,
  isTomorrow,
} = require('date-fns');

// Parsing regex
const aptRegExp = /^(?<startdate>\d{2}\/\d{2}\/\d{4} @ \d{2}:\d{2}) -> (?<enddate>\d{2}\/\d{2}\/\d{4} @ \d{2}:\d{2})((\|)|(?<flagged>!)|(?<notehash>>[\dA-Za-z]+ \|))(?<text>.*)$/;

class Apt {
  static filename() {
    return 'apts';
  }

  constructor(aptstr) {
    const m = aptstr.match(aptRegExp);
    if (m == null) return m;

    this.startdate = new Date(Date.parse(m.groups.startdate));
    this.enddate = new Date(Date.parse(m.groups.enddate));
    this.flagged = m.groups.flagged === '!';
    this.notehash = m.groups.notehash ? m.groups.notehash.slice(1) : null;
    this.text = m.groups.text ? m.groups.text : '';
  }

  inEventRange(date) {
    if (!(date instanceof Date)) throw new Error('Argument must be a Date');
    return (date > this.startdate && date < this.enddate);
  }

  isSameDay(date) {
    if (!(date instanceof Date)) throw new Error('Argument must be a Date');
    return isSameDay(date, this.startdate) || isSameDay(date, this.enddate);
  }

  isSameWeek(date) {
    if (!(date instanceof Date)) throw new Error('Argument must be a Date');
    return isSameWeek(date, this.startdate) || isSameWeek(date, this.enddate);
  }

  isTomorrow() {
    return isTomorrow(this.startdate) || isTomorrow(this.enddate);
  }

  toString() {
    const startstr = format(this.startdate, 'dd/MM/yyyy @ hh:mm');
    const endstr = format(this.enddate, 'dd/MM/yyyy @ hh:mm');
    const notehash = this.notehash ? `>${this.notehash} ` : '';
    const separator = this.flagged ? '!' : '|';
    return `${startstr} -> ${endstr}${notehash}${separator}${this.text}`;
  }
}

module.exports = Apt;
