import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find({
      order: { usage_count: 'DESC' },
    });
  }

  async findPopular(limit: number = 10): Promise<Tag[]> {
    return this.tagRepository.find({
      order: { usage_count: 'DESC' },
      take: limit,
    });
  }

  async create(name: string, category?: string): Promise<Tag> {
    let tag = await this.tagRepository.findOne({ where: { name } });
    if (!tag) {
      tag = this.tagRepository.create({ name, category });
      tag = await this.tagRepository.save(tag);
    }
    return tag;
  }

  async getSuggestions(query?: string): Promise<Tag[]> {
    const qb = this.tagRepository.createQueryBuilder('tag');
    if (query) {
      qb.where('tag.name ILIKE :query', { query: `%${query}%` });
    }
    return qb.orderBy('tag.usage_count', 'DESC').limit(10).getMany();
  }
}

