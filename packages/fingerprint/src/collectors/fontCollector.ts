import { hashString } from '../utils/hash';

const COMMON_FONTS = [
  // Windows fonts
  'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 
  'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 
  'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'Impact', 
  'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 
  'Malgun Gothic', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 
  'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 
  'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 
  'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 
  'Segoe Script', 'Segoe UI', 'Segoe UI Historic', 'Segoe UI Emoji', 'Segoe UI Symbol', 
  'SimSun', 'Sitka', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 
  'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic',
  
  // macOS fonts
  'American Typewriter', 'Andale Mono', 'Arial', 'Arial Black', 'Arial Narrow', 
  'Arial Rounded MT Bold', 'Arial Unicode MS', 'Avenir', 'Avenir Next', 'Avenir Next Condensed', 
  'Baskerville', 'Big Caslon', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 
  'Bradley Hand', 'Brush Script MT', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 
  'Charter', 'Cochin', 'Comic Sans MS', 'Copperplate', 'Courier', 'Courier New', 
  'Didot', 'DIN Alternate', 'DIN Condensed', 'Futura', 'Geneva', 'Georgia', 
  'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Impact', 
  'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Microsoft Sans Serif', 
  'Monaco', 'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate', 
  'Rockwell', 'Savoye LET', 'SignPainter', 'Skia', 'Snell Roundhand', 'Tahoma', 
  'Times', 'Times New Roman', 'Trattatello', 'Trebuchet MS', 'Verdana', 'Zapfino',
  
  // Common web fonts
  'Open Sans', 'Roboto', 'Lato', 'Montserrat', 'Roboto Condensed', 'Source Sans Pro',
  'Oswald', 'Raleway', 'Slabo 27px', 'PT Sans', 'Merriweather', 'Ubuntu', 'Nunito',
  'Fira Sans', 'Playfair Display', 'Barlow', 'Work Sans'
];

const SAMPLE_TEXT = 'mmmmmmmmmmlli';
const DEFAULT_FONT_SIZE = '72px';
const DEFAULT_TEST_DIV_HEIGHT = 100;
const DEFAULT_TEST_DIV_WIDTH = 1000;

/**
 * Detects available fonts by comparing text dimensions with reference fonts
 */
export const detectFonts = async (): Promise<{ fonts: string[]; hash: string }> => {
  try {
    // Check if browser environment
    if (typeof document === 'undefined') {
      return { fonts: [], hash: '' };
    }
    
    // Create a hidden testing div
    const testDiv = document.createElement('div');
    Object.assign(testDiv.style, {
      position: 'absolute',
      left: '-9999px',
      visibility: 'hidden',
      height: `${DEFAULT_TEST_DIV_HEIGHT}px`,
      width: `${DEFAULT_TEST_DIV_WIDTH}px`,
      fontSize: DEFAULT_FONT_SIZE,
      lineHeight: 'normal'
    });
    
    document.body.appendChild(testDiv);
    
    // Get the dimensions of the text in our reference fonts
    const baselineFonts = {
      'monospace': measureTextWidth(testDiv, 'monospace'),
      'sans-serif': measureTextWidth(testDiv, 'sans-serif'),
      'serif': measureTextWidth(testDiv, 'serif')
    };
    
    // Detect available fonts
    const detectedFonts: string[] = [];
    
    for (const font of COMMON_FONTS) {
      // Test each font against all three baselines to be sure
      const isFontAvailable = 
        // Assume font is sans-serif
        measureTextWidth(testDiv, `${font}, sans-serif`) !== baselineFonts['sans-serif'] ||
        // Assume font is serif
        measureTextWidth(testDiv, `${font}, serif`) !== baselineFonts['serif'] ||
        // Assume font is monospace
        measureTextWidth(testDiv, `${font}, monospace`) !== baselineFonts['monospace'];
      
      if (isFontAvailable) {
        detectedFonts.push(font);
      }
    }
    
    // Clean up
    document.body.removeChild(testDiv);
    
    // Sort fonts for consistent order
    detectedFonts.sort();
    
    // Generate hash from detected fonts
    const hash = hashString(detectedFonts.join(','));
    
    return { fonts: detectedFonts, hash };
  } catch (error) {
    console.warn('Error detecting fonts:', error);
    return { fonts: [], hash: '' };
  }
};

/**
 * Measures the width of sample text with the given font
 */
const measureTextWidth = (testDiv: HTMLDivElement, fontFamily: string): number => {
  testDiv.style.fontFamily = fontFamily;
  testDiv.textContent = SAMPLE_TEXT;
  return testDiv.offsetWidth;
}; 