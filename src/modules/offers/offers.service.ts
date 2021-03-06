import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { CompaniesService } from '../companies/companies.service';
import { OfferFilterDto } from './dto/offer-filter.dto';
import { FinalOfferDto } from './dto/final-offer.dto';
import { OfferDto } from './dto/offer.dto';
import { SpecializationFilterDto } from './dto/specialization-filter.dto';
import { AgreementType } from './entities/agreementType.entity';
import { Offer } from './entities/offer.entity';
import { Profession } from './entities/profession.entity';
import { Specialization } from './entities/specialization.entity';
import { CompanyLocation } from '../companies/entities/companyLocation.entity';
import { OffersRepository } from './offers.repository';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(OffersRepository)
    private offerRepository: OffersRepository,
    @InjectRepository(Profession)
    private professionRepository: Repository<Profession>,
    @InjectRepository(Specialization)
    private specializationRepository: Repository<Specialization>,
    @InjectRepository(AgreementType)
    private agreementTypeRepository: Repository<AgreementType>,
    private companiesService: CompaniesService,
    @InjectRepository(CompanyLocation)
    private companyLocationRepository: Repository<CompanyLocation>,
  ) {}

  async findAll(filterDto: OfferFilterDto): Promise<Offer[]> {
    return await this.offerRepository.findByQuery(filterDto);
  }

  async findOne(id: number): Promise<Offer> {
    const foundOffer = await this.offerRepository.findOne(id, {
      relations: [
        'company',
        'specialization',
        'profession',
        'locations',
        'agreement_types',
      ],
    });
    if (!foundOffer) {
      throw new NotFoundException(`Offer with ID "${id}" not found`);
    }

    return foundOffer;
  }

  async create(data: OfferDto, user: User): Promise<Offer> {
    const company = await this.companiesService.findByUserId(user.id);

    if (!company) {
      throw new BadRequestException('User have to create company first');
    }

    const offer: FinalOfferDto = { ...data, company_id: company.id };

    if (data.agreement_type_ids && data.agreement_type_ids.length) {
      offer.agreement_types = await this.agreementTypeRepository.findByIds(
        data.agreement_type_ids,
      );
    }

    if (data.company_location_ids && data.company_location_ids.length) {
      offer.locations = await this.companyLocationRepository.findByIds(
        data.company_location_ids,
      );
    }

    return await this.offerRepository.create(offer).save();
  }

  async update(id: number, data: OfferDto, user: User): Promise<Offer> {
    const company = await this.companiesService.findByUserId(user.id);

    if (!company) {
      throw new BadRequestException('User have to create company first');
    }
    const companyOffersIds = company.offers.map((el) => el.id);
    if (!companyOffersIds.includes(+id)) {
      throw new BadRequestException(
        `User cannot update others company's offer`,
      );
    }

    const offer: Offer = await this.offerRepository.findOne(id);

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const offerData: any = { ...data, company_id: company.id };

    if (data.agreement_type_ids) {
      delete offerData.agreement_type_ids;
      offerData.agreement_types = await this.agreementTypeRepository.findByIds(
        data.agreement_type_ids,
      );
    }

    if (data.company_location_ids) {
      delete offerData.company_location_ids;
      offerData.locations = await this.companyLocationRepository.findByIds(
        data.company_location_ids,
      );
    }

    return this.offerRepository.save({ ...offer, ...offerData });
  }

  async findAllProfessions(): Promise<Profession[]> {
    return this.professionRepository.find();
  }

  async findAllSpecializations(
    filterDto: SpecializationFilterDto,
  ): Promise<Specialization[]> {
    return this.specializationRepository.find(filterDto);
  }

  async findAllAgreementTypes(): Promise<AgreementType[]> {
    return this.agreementTypeRepository.find();
  }
}
