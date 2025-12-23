import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { ShareLink } from '../shares/entities/share-link.entity';
import { TeamsService } from '../teams/teams.service';
import { VideosService } from '../videos/videos.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: Repository<Project>;
  let dataSource: DataSource;

  const mockProjectRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  const mockMemberRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockAuditLogRepository = {
    save: jest.fn(),
  };

  const mockDeliveryRepository = {
    delete: jest.fn(),
  };

  const mockShareLinkRepository = {
    delete: jest.fn(),
  };

  const mockTeamsService = {
    getUserRole: jest.fn(),
    findOne: jest.fn(),
  };

  const mockVideosService = {
    deleteByProject: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        remove: jest.fn(),
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockMemberRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: getRepositoryToken(Delivery),
          useValue: mockDeliveryRepository,
        },
        {
          provide: getRepositoryToken(ShareLink),
          useValue: mockShareLinkRepository,
        },
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
        {
          provide: VideosService,
          useValue: mockVideosService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('应该返回项目当存在时', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        client: 'Test Client',
        team_id: 'team-1',
      };

      mockProjectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProject);
      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('应该抛出NotFoundException当项目不存在时', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

