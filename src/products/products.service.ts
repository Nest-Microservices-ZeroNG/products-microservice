import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from '../common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit(): any {
    this.$connect();
    this.logger.log('Database Sqlite Connected!');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: { ...createProductDto },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const total = await this.product.count({ where: { available: true } });
    const pages = Math.ceil(total / limit);

    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { available: true },
      }),
      meta: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true },
    });
    if (!product)
      //throw new NotFoundException(`Product with ID ${id} not found`);
      throw new RpcException({
        message: `Product with ID ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;

    await this.findOne(id);
    return this.product.update({
      where: { id },
      data: { ...data },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    //return this.product.delete({
    //  where: { id },
    //});
    return this.product.update({
      where: { id },
      data: {
        available: false,
      },
    });
  }

  async validateProducts(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    });

    if (products.length !== uniqueIds.length) {
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return products;
  }
}
