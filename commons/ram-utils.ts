export class Utils {
    public static applyMixins<T extends { new (): T }>(derivedCtor: T, baseCtors: any[]) {
        baseCtors.forEach(baseCtor => {
            Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
                derivedCtor.prototype[name] = baseCtor.prototype[name];
            });
        });
        return derivedCtor;
    }

    public static dateToDDMMYYYY(date: Date) {
        if (date) {
            return date.getDay() + '/' + date.getMonth() + '/' + date.getFullYear();
        }
    }

    public static parseDate(dateString: string): Date {
        if (dateString === null) {
            return null;
        }

        if (!/^\d{4}\-\d{1,2}\-\d{1,2}$/.test(dateString)) {
            return null;
        }

        let parts = dateString.split('-');
        let day = parseInt(parts[2], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[0], 10);

        if (year < 1000 || year > 3000 || month === 0 || month > 12) {
            return null;
        }

        let monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) {
            monthLength[1] = 29;
        }

        // Check the range of the day
        if (day > 0 && day <= monthLength[month - 1]) {
            return new Date(year, month, day);
        }
        return null;
    };
}
