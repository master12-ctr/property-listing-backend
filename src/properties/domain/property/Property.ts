export enum PropertyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
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
    coordinates?: [number, number];
  };
  price: number;
  images: string[];
  status: PropertyStatus;
  type: PropertyType;
  ownerId: string;
  views: number = 0;
  favoritesCount: number = 0;
  metadata?: Record<string, any>;
  publishedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Domain methods
  publish(): void {
    if (this.status === PropertyStatus.PUBLISHED) {
      throw new Error('Property is already published');
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

  softDelete(): void {
    this.deletedAt = new Date();
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  canBeEdited(): boolean {
    return this.status !== PropertyStatus.PUBLISHED;
  }
}