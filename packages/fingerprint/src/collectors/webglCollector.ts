import { hashString } from '../utils/hash';

interface WebGLData {
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  params: Record<string, any>;
  extensions: string[];
  hash: string;
}

/**
 * Collect WebGL information for fingerprinting
 */
export const collectWebGLFingerprint = async (): Promise<WebGLData> => {
  try {
    // Check if WebGL is supported
    if (typeof document === 'undefined' || !document.createElement) {
      return createEmptyWebGLData();
    }
    
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return createEmptyWebGLData();
    }
    
    // Collect standard vendor and renderer info
    const vendor = gl.getParameter(gl.VENDOR) || '';
    const renderer = gl.getParameter(gl.RENDERER) || '';
    
    // Collect unmasked vendor and renderer info (more precise)
    let unmaskedVendor = '';
    let unmaskedRenderer = '';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    }
    
    // Collect various parameters
    const params: Record<string, any> = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
      aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
      maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      redBits: gl.getParameter(gl.RED_BITS),
      greenBits: gl.getParameter(gl.GREEN_BITS),
      blueBits: gl.getParameter(gl.BLUE_BITS),
      alphaBits: gl.getParameter(gl.ALPHA_BITS),
      depthBits: gl.getParameter(gl.DEPTH_BITS),
      stencilBits: gl.getParameter(gl.STENCIL_BITS)
    };
    
    // Collect supported extensions
    const extensionsString = gl.getSupportedExtensions() || [];
    const extensions = Array.from(extensionsString);
    
    // Generate hash from all collected data
    const glData = {
      vendor,
      renderer,
      unmaskedVendor,
      unmaskedRenderer,
      params,
      extensions
    };
    
    const hash = hashString(JSON.stringify(glData));
    
    return {
      ...glData,
      hash
    };
  } catch (error) {
    console.warn('Error collecting WebGL fingerprint:', error);
    return createEmptyWebGLData();
  }
};

/**
 * Create an empty WebGL data object when WebGL is not available
 */
const createEmptyWebGLData = (): WebGLData => ({
  vendor: '',
  renderer: '',
  unmaskedVendor: '',
  unmaskedRenderer: '',
  params: {},
  extensions: [],
  hash: ''
}); 