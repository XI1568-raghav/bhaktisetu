import { describe, it, expect } from 'vitest';
import {
  wikiThumb,
  wikiResize,
  resizeImage,
  getImage,
  getTempleHero,
  getTempleThumbnail,
  getTempleGallery,
  getDeityImage,
  getPujaImage,
  getProductImage,
  getHeroImage,
  getAstrologerImage,
  getFestivalImage,
  getContentImage,
  IMAGES,
} from '../lib/images';

describe('wikiThumb', () => {
  it('passes through non-Wikimedia URLs unchanged', () => {
    const url = 'https://images.unsplash.com/photo-123?w=800';
    expect(wikiThumb(url, 500)).toBe(url);
  });

  it('snaps requested width up to the next ladder step', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/bc/Foo.jpg/250px-Foo.jpg';
    const result = wikiThumb(url, 300);
    // 300 snaps up to the 330 ladder step.
    expect(result).toContain('330px-');
  });

  it('rewrites width on existing thumb URLs', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/bc/Foo.jpg/1280px-Foo.jpg';
    const result = wikiThumb(url, 500);
    expect(result).toContain('500px-Foo.jpg');
    expect(result).not.toContain('1280px-');
  });

  it('builds thumb URL from a Commons original', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/a/bc/MyFile.jpg';
    const result = wikiThumb(url, 800);
    expect(result).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/bc/MyFile.jpg/960px-MyFile.jpg',
    );
  });

  it('appends .png to .svg files when building thumb', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/a/bc/Logo.svg';
    const result = wikiThumb(url, 500);
    expect(result).toContain('500px-Logo.svg.png');
  });

  it('caps oversize requests at the largest ladder step', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/a/bc/Big.jpg';
    const result = wikiThumb(url, 99999);
    expect(result).toContain('3840px-');
  });
});

describe('wikiResize', () => {
  it('aliases to wikiThumb', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/bc/Foo.jpg/250px-Foo.jpg';
    expect(wikiResize(url, 500)).toBe(wikiThumb(url, 500));
  });
});

describe('resizeImage', () => {
  it('rewrites Unsplash w/h/q params for the hero preset', () => {
    const url = 'https://images.unsplash.com/photo-123?w=400&h=300&q=70';
    const result = resizeImage(url, 'hero');
    expect(result).toContain('w=1600');
    expect(result).toContain('h=900');
    expect(result).toContain('q=85');
  });

  it('routes Wikimedia URLs through wikiResize for the card preset', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/bc/Foo.jpg/1280px-Foo.jpg';
    const result = resizeImage(url, 'card');
    expect(result).toContain('960px-');
  });
});

describe('getTempleHero / getTempleThumbnail / getTempleGallery', () => {
  it('returns a temple hero URL', () => {
    const url = getTempleHero('kashi-vishwanath');
    expect(url).toContain('/images/temples/kashi-vishwanath');
  });

  it('returns the fallback image for an unknown slug', () => {
    const url = getTempleHero('not-a-real-temple');
    expect(url).toContain('/images/temples/kashi-vishwanath');
  });

  it('returns gallery images for known temples', () => {
    const gallery = getTempleGallery('kashi-vishwanath');
    expect(gallery.length).toBeGreaterThan(0);
  });

  it('returns an empty gallery for unknown temples', () => {
    expect(getTempleGallery('zzz')).toEqual([]);
  });

  it('thumbnail uses an 800-step ladder width', () => {
    const url = getTempleThumbnail('siddhivinayak');
    expect(url).toMatch(/\/images\/temples\/siddhivinayak(-500)?\.webp$/);
  });
});

describe('getImage / getDeityImage / getPujaImage / getProductImage', () => {
  it('returns a fallback when category is unknown', () => {
    expect(getImage('unknown', 'foo')).toContain('upload.wikimedia.org');
  });

  it('returns deity portrait by slug', () => {
    expect(getDeityImage('lord-shiva')).toContain('/images/content/bangalore-shiva');
  });

  it('returns square deity variant when requested', () => {
    expect(getDeityImage('lord-ganesha', 'square')).toContain('/images/content/ganesha-basohli');
  });

  it('returns a puja image for known slug', () => {
    expect(getPujaImage('rudrabhishek')).toContain('/images/content/from-abhisheka-to-panchamrutha');
  });

  it('returns a product image for known store slug', () => {
    expect(getProductImage('brass-puja-thali')).toContain('/images/store/prod_001');
  });

  it('returns hero image for given page', () => {
    expect(getHeroImage('home')).toContain('/images/temples/');
  });

  it('returns festival image', () => {
    expect(getFestivalImage('diwali')).toContain('/images/content/the-rangoli-of-lights');
  });

  it('returns content image with thumbnail variant', () => {
    expect(getContentImage('aarti', 'thumbnail')).toContain('/images/content/1-aarti-thali-prayer-plate-india');
  });

  it('returns astrologer image cycling through pool', () => {
    const a = getAstrologerImage('male', 0);
    const b = getAstrologerImage('male', IMAGES.astrologers.male.length);
    expect(a).toBe(b);
  });
});
