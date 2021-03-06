import { EntityRepository, Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { OfferFilterDto } from './dto/offer-filter.dto';

const orderByParams = {
  latest: ['offer.created_at', 'DESC'],
  'salary-max': ['offer.salary_to', 'DESC'],
  'salary-min': ['offer.salary_from', 'ASC'],
};

@EntityRepository(Offer)
export class OffersRepository extends Repository<Offer> {
  findByQuery(filterDto: OfferFilterDto): Promise<Offer[]> {
    const {
      title,
      city,
      salary_from: salaryFrom = 0,
      salary_to: salaryTo = 20000,
      order = 'latest',
      ...restFilters
    } = filterDto;

    const orderParam = orderByParams[order];

    return this.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.company', 'company')
      .innerJoin('offer.locations', 'locationsCondition')
      .leftJoinAndSelect('offer.agreement_types', 'agreement_types')
      .leftJoinAndSelect('offer.specialization', 'specialization')
      .leftJoinAndSelect('offer.profession', 'profession')
      .where({
        ...restFilters,
        active: true,
      })
      .andWhere('offer.title like :title', { title: `%${title || ''}%` })
      .andWhere('locationsCondition.city like :city', {
        city: `%${city || ''}%`,
      })
      .andWhere('offer.active IS TRUE')
      .andWhere('offer.paid_till > :now', { now: new Date().toISOString() })
      .andWhere('offer.salary_to <= :salaryTo', { salaryTo })
      .andWhere('offer.salary_to >= :salaryFrom', { salaryFrom })
      .leftJoinAndSelect('offer.locations', 'locations')
      .orderBy(orderParam[0], orderParam[1])
      .getMany();
  }
}
