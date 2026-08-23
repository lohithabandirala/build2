import exifr from 'exifr';
import fs from 'fs';

interface ForensicResult {
  isFake: boolean;
  reasons: string[];
}

// Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

export async function analyzeImageForensics(
  filePath: string,
  reportedLat: number,
  reportedLng: number
): Promise<ForensicResult> {
  const result: ForensicResult = { isFake: false, reasons: [] };

  try {
    const buffer = fs.readFileSync(filePath);
    
    // Extract EXIF data
    const exif = await exifr.parse(buffer);
    if (!exif) {
      result.reasons.push("Suspicious: Image metadata is completely stripped (possibly downloaded from social media or internet).");
      // Not strictly marking as fake just for missing EXIF to avoid false positives from some camera apps
      return result;
    }

    // 1. Temporal Forgery: Check Date
    if (exif.DateTimeOriginal) {
      const photoDate = new Date(exif.DateTimeOriginal);
      const now = new Date();
      const diffHours = (now.getTime() - photoDate.getTime()) / (1000 * 60 * 60);
      
      if (diffHours > 72) {
        result.isFake = true;
        result.reasons.push(`Temporal Forgery: Photo was taken on ${photoDate.toISOString().split('T')[0]}, which is more than 72 hours ago. Recycled image detected.`);
      }
    }

    // 2. Spatial Forgery: Check GPS
    if (exif.latitude != null && exif.longitude != null && reportedLat && reportedLng) {
      const distance = getDistance(exif.latitude, exif.longitude, reportedLat, reportedLng);
      
      // If the EXIF GPS is more than 500 meters away from the reported browser GPS
      if (distance > 500) {
        result.isFake = true;
        result.reasons.push(`Spatial Forgery (Location Spoofing): Image's embedded GPS is ${(distance / 1000).toFixed(2)} km away from the submitted location.`);
      }
    }

    // 3. Software Tampering: Check Software tag
    if (exif.Software) {
      const software = exif.Software.toLowerCase();
      if (software.includes('photoshop') || software.includes('canva') || software.includes('gimp') || software.includes('paint')) {
        result.isFake = true;
        result.reasons.push(`Software Tampering: Image appears to have been edited using ${exif.Software}.`);
      }
    }

  } catch (error) {
    console.error("Forensic analysis failed:", error);
  }

  return result;
}
