import { FastifyInstance } from 'fastify';
import { Reader, CityResponse } from 'maxmind';
import fs from 'fs';
import path from 'path';
import config from '../config';

let geoIpReader: Reader<CityResponse> | null = null;

/**
 * Initialize GeoIP service
 */
export const initGeoIpService = async (server: FastifyInstance): Promise<void> => {
  try {
    server.log.info('Initializing GeoIP service...');
    
    // Check if GeoIP database exists
    const dbPath = config.geoip.dbPath;
    
    if (!fs.existsSync(dbPath)) {
      server.log.warn(`GeoIP database not found at ${dbPath}`);
      server.log.info('GeoIP service will provide limited functionality');
      return;
    }
    
    // Create GeoIP reader
    const dbBuffer = fs.readFileSync(dbPath);
    geoIpReader = new Reader<CityResponse>(dbBuffer);
    
    server.log.info('GeoIP service initialized successfully');
  } catch (error) {
    server.log.error('Failed to initialize GeoIP service:', error);
    throw error;
  }
};

/**
 * Look up geographical information for an IP address
 */
export const lookupIp = (ipAddress: string): {
  country?: string;
  city?: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  postalCode?: string;
  isp?: string;
  asn?: string;
} => {
  if (!geoIpReader) {
    return {};
  }
  
  try {
    const result = geoIpReader.get(ipAddress);
    
    if (!result) {
      return {};
    }
    
    return {
      country: result.country?.iso_code,
      city: result.city?.names?.en,
      continent: result.continent?.code,
      latitude: result.location?.latitude,
      longitude: result.location?.longitude,
      timezone: result.location?.time_zone,
      postalCode: result.postal?.code,
      isp: result.traits?.isp,
      asn: result.traits?.autonomous_system_number 
        ? `AS${result.traits.autonomous_system_number}` 
        : undefined
    };
  } catch (error) {
    console.error(`Error looking up IP ${ipAddress}:`, error);
    return {};
  }
};

/**
 * Anonymize an IP address by zeroing out the last octet (IPv4) or the last 80 bits (IPv6)
 */
export const anonymizeIp = (ipAddress: string): string => {
  // Check if IPv6
  if (ipAddress.includes(':')) {
    // IPv6: Anonymize by keeping only the first 48 bits (first 3 groups)
    const parts = ipAddress.split(':');
    const anonymized = [...parts.slice(0, 3), '0000', '0000', '0000', '0000', '0000'];
    return anonymized.join(':');
  } else {
    // IPv4: Anonymize by zeroing out the last octet
    const parts = ipAddress.split('.');
    const anonymized = [...parts.slice(0, 3), '0'];
    return anonymized.join('.');
  }
}; 