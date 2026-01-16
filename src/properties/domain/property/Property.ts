// ./properties/domain/property/Property.ts
export enum PropertyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DISABLED = 'disabled',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  VILLA = 'villa',
  COMMERCIAL = 'commercial',
  LAND = 'land',
}

export class Property {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
  };
  price: number;
  images: string[];
  status: PropertyStatus;
  type: PropertyType;
  ownerId: string;
  views: number = 0;
  favoritesCount: number = 0;
  favoritedBy: string[] = [];
  metadata?: Record<string, any>;
  publishedAt?: Date;
  deletedAt?: Date;
  disabledAt?: Date;
  disabledBy?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Property> = {}) {
    Object.assign(this, partial);
    this.views = this.views || 0;
    this.favoritesCount = this.favoritesCount || 0;
    this.favoritedBy = this.favoritedBy || [];
  }

  publish(): void {
    if (this.status === PropertyStatus.PUBLISHED) {
      throw new Error('Property is already published');
    }
    if (this.status === PropertyStatus.DISABLED) {
      throw new Error('Disabled properties cannot be published');
    }
    if (!this.images || this.images.length === 0) {
      throw new Error('Property must have at least one image to publish');
    }
    this.status = PropertyStatus.PUBLISHED;
    this.publishedAt = new Date();
  }

  archive(): void {
    this.status = PropertyStatus.ARCHIVED;
  }

  disable(disabledBy: string): void {
    this.status = PropertyStatus.DISABLED;
    this.disabledAt = new Date();
    this.disabledBy = disabledBy;
  }

  enable(): void {
    if (this.status === PropertyStatus.DISABLED) {
      this.status = PropertyStatus.DRAFT;
      this.disabledAt = undefined;
      this.disabledBy = undefined;
    }
  }

  softDelete(): void {
    this.deletedAt = new Date();
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  canBeEdited(): boolean {
    return this.status !== PropertyStatus.PUBLISHED && this.status !== PropertyStatus.DISABLED;
  }

  canBePublished(): boolean {
    return this.status === PropertyStatus.DRAFT && 
           this.images && 
           this.images.length > 0;
  }

  addFavorite(userId: string): void {
    if (!this.favoritedBy.includes(userId)) {
      this.favoritedBy.push(userId);
      this.favoritesCount += 1;
    }
  }

  removeFavorite(userId: string): void {
    const index = this.favoritedBy.indexOf(userId);
    if (index > -1) {
      this.favoritedBy.splice(index, 1);
      this.favoritesCount = Math.max(0, this.favoritesCount - 1);
    }
  }
}