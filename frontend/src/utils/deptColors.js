// src/utils/deptColors.js — Department specific branding
export const DEPT_THEMES = {
  'Dermatology': {
    primary: '#EC4899',       // pink
    soft: '#FDF2F8',
    border: '#FBCFE8',
    text: '#BE185D',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    badgeBg: '#FDF2F8',
  },
  'Cardiology': {
    primary: '#F43F5E',       // rose
    soft: '#FFF1F2',
    border: '#FECDD3',
    text: '#E11D48',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
    badgeBg: '#FFF1F2',
  },
  'Orthopedics': {
    primary: '#F97316',       // orange
    soft: '#FFF7ED',
    border: '#FFEDD5',
    text: '#C2410C',
    gradient: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
    badgeBg: '#FFF7ED',
  },
  'ENT': {
    primary: '#0EA5E9',       // sky blue
    soft: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
    badgeBg: '#F0F9FF',
  },
  'Pediatrics': {
    primary: '#65A30D',       // lime
    soft: '#F7FEE7',
    border: '#D9F99D',
    text: '#4D7C0F',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
    badgeBg: '#F7FEE7',
  },
  'Gynecology': {
    primary: '#A855F7',       // purple
    soft: '#FAF5FF',
    border: '#E9D5FF',
    text: '#7E22CE',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
    badgeBg: '#FAF5FF',
  },
  'General Medicine': {
    primary: '#0D9488',       // teal
    soft: '#F0FDFA',
    border: '#99F6E4',
    text: '#0F766E',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    badgeBg: '#F0FDFA',
  },
};

export const getDeptTheme = (dept) => DEPT_THEMES[dept] || DEPT_THEMES['General Medicine'];
