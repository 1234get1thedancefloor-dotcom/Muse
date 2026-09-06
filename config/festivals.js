const festivalCalendar = {
    '01-14': 'Pongal / Makar Sankranti',
    '08-15': 'Independence Day Celebration',
    '10-02': 'Gandhi Jayanti',
    '12-25': 'Christmas Eve Festivities',

    '2026-09-05': 'Teachers Day Bash',
    '2026-09-17': 'Ganesh Chaturthi Event',
    '2026-11-08': 'Diwali Festival of Lights',
    '2026-08-27': 'Onam Celebration Feast'
};

function getCelebrationForDate(dateStr) {
    if (festivalCalendar[dateStr]) {
        return festivalCalendar[dateStr];
    }
    const shortDate = dateStr.substring(5);
    if (festivalCalendar[shortDate]) {
        return festivalCalendar[shortDate];
    }
    return null;
}

module.exports = { getCelebrationForDate };
