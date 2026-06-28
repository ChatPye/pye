import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get client IP from request headers
    const headers = request.headers;
    const forwarded = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1';

    // Use a free IP geolocation service
    const geoResponse = await fetch(`https://ipapi.co/${clientIp}/json/`, {
      headers: {
        'User-Agent': 'ChatPye/1.0'
      }
    });

    if (!geoResponse.ok) {
      throw new Error('Failed to fetch geolocation');
    }

    const geoData = await geoResponse.json();

    return NextResponse.json({
      country: geoData.country_code,
      country_name: geoData.country_name,
      region: geoData.region,
      city: geoData.city,
      timezone: geoData.timezone,
      currency: geoData.currency,
      currency_symbol: geoData.currency_symbol
    });

  } catch (error) {
    console.error('Geolocation error:', error);
    
    // Fallback to US
    return NextResponse.json({
      country: 'US',
      country_name: 'United States',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'America/New_York',
      currency: 'USD',
      currency_symbol: '$'
    });
  }
}