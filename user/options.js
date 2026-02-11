const themes = {
    default: {
        '--background-color': '#181B1E',
        '--background-variant': '#5F6266',
        '--card-background-color': '#A5A9AE',
        '--highlight-color': '#CFD1D4',
        '--light-color': '#F8F9FA',
        '--font-color-on-bg': '#F8F9FA',
        '--font-color-on-lg': '#181B1E',
        '--font-color-default': 'snow',
    },
    light: {
        '--background-color': '#F8F9FA',
        '--background-variant': '#E9ECEF',
        '--card-background-color': '#FFFFFF',
        '--highlight-color': '#6d6d6d',
        '--light-color': '#495057',
        '--font-color-on-bg': '#181B1E',
        '--font-color-on-lg': '#6b6c6d',
        '--font-color-default': '#181B1E',
    },
    ocean: {
        '--background-color': '#0A2463',
        '--background-variant': '#1E3A5F',
        '--card-background-color': '#3E92CC',
        '--highlight-color': '#D8E9F0',
        '--light-color': '#FFFAFF',
        '--font-color-on-bg': '#FFFAFF',
        '--font-color-on-lg': '#0A2463',
        '--font-color-default': '#FFFAFF',
    },
    forest: {
        '--background-color': '#1B4332',
        '--background-variant': '#2D6A4F',
        '--card-background-color': '#52B788',
        '--highlight-color': '#95D5B2',
        '--light-color': '#D8F3DC',
        '--font-color-on-bg': '#D8F3DC',
        '--font-color-on-lg': '#1B4332',
        '--font-color-default': '#D8F3DC',
    },
    sunset: {
        '--background-color': '#2B1B17',
        '--background-variant': '#5C3D2E',
        '--card-background-color': '#D4A574',
        '--highlight-color': '#F4E4C1',
        '--light-color': '#FFF8E7',
        '--font-color-on-bg': '#FFF8E7',
        '--font-color-on-lg': '#2B1B17',
        '--font-color-default': '#FFF8E7',
    }
};

function applyTheme(themeName, customColors = null) {
    const theme = (themeName === 'custom' && customColors) ? customColors : themes[themeName];
    
    if (!theme) return;

    const root = document.documentElement;
    
    Object.entries(theme).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });

    localStorage.setItem('selectedTheme', themeName);
    localStorage.setItem('appliedThemeColors', JSON.stringify(theme));
}

export function init() {
    const themeOptions = document.querySelectorAll('.theme-option');
    const customEditor = document.querySelector('.custom-theme-editor');

    document.getElementById('exportJSON')?.addEventListener('click', handleExportJSON);
    document.getElementById('exportExcel')?.addEventListener('click', handleExportExcel);
    
    const savedCustom = JSON.parse(localStorage.getItem('customTheme'));
    if (savedCustom) {
        document.getElementById('bgColor').value = savedCustom['--background-color'];
        document.getElementById('variantColor').value = savedCustom['--background-variant'];
        document.getElementById('cardColor').value = savedCustom['--card-background-color'];
        document.getElementById('highlightColor').value = savedCustom['--highlight-color'];
        document.getElementById('lightColor').value = savedCustom['--light-color'];
        if(document.getElementById('fontBgColor')) document.getElementById('fontBgColor').value = savedCustom['--font-color-on-bg'];
        if(document.getElementById('fontDefaultColor')) document.getElementById('fontDefaultColor').value = savedCustom['--font-color-default'];

        document.getElementById("ch-custom").style.backgroundColor = savedCustom['--background-color'];
        document.getElementById("cqt-custom").style.backgroundColor = savedCustom['--background-variant'];
        document.getElementById("cqb-custom").style.backgroundColor = savedCustom['--card-background-color'];
    }

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const themeName = option.dataset.theme;
            themeOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            if (themeName === 'custom') {
                customEditor.classList.remove('hidden');
            } else {
                customEditor.classList.add('hidden');
                applyTheme(themeName);
            }
        });
    });

    const applyBtn = document.getElementById('applyCustomTheme');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const customColors = {
                '--background-color': document.getElementById('bgColor').value,
                '--background-variant': document.getElementById('variantColor').value,
                '--card-background-color': document.getElementById('cardColor').value,
                '--highlight-color': document.getElementById('highlightColor').value,
                '--light-color': document.getElementById('lightColor').value,
                '--font-color-on-bg': document.getElementById('fontDefaultColor').value,
                '--font-color-on-lg': document.getElementById('fontLgColor').value,
                '--font-color-default': document.getElementById('fontDefaultColor').value,
            };
            localStorage.setItem('customTheme', JSON.stringify(customColors));
            applyTheme('custom', customColors);
        });
    }

    return () => {

    };
}