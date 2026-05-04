const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export function dateKey(date) {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getMonthMatrix(date = new Date()) {
    const anchor = new Date(date);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    const weeks = [];

    for (let week = 0; week < 6; week += 1) {
        const days = [];

        for (let day = 0; day < 7; day += 1) {
            const current = new Date(start);
            current.setDate(start.getDate() + (week * 7) + day);

            days.push({
                date: current,
                key: dateKey(current),
                day: current.getDate(),
                isCurrentMonth: current.getMonth() === month,
                isToday: dateKey(current) === dateKey(new Date())
            });
        }

        weeks.push(days);
    }

    return weeks;
}

export function formatDayLabel(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    }).format(new Date(date));
}

export function formatMonthLabel(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
    }).format(new Date(date));
}

export function groupByDate(items, getDate) {
    return items.reduce((groups, item) => {
        const key = dateKey(getDate(item));
        if (!key) return groups;

        if (!groups[key]) groups[key] = [];
        groups[key].push(item);

        return groups;
    }, {});
}

export function getWeekdayLabels() {
    return [...WEEKDAY_LABELS];
}
